'use client'

import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'

import { getCurrentBattleNumber, postBattleLog, updateUserStats } from '@api'
import { Alert, Button, ModalOverlay } from '@components'
import { BattleState, CPUDetails, ICard, UserDetails } from '@interfaces'
import { useOpponentsStore, useUserStore } from '@stores'
import { updateState } from '@utils'

import { BattleResults, Board, Hand, RoundResult } from './components'
import { cpuMove } from './lib/ai'
import { battleProcessor } from './lib/logic'
import { assignColorsAndDealCards, shuffleCards } from './utils'

import './battle.scss'

const Battle = () => {
	const router = useRouter()
	// Get user and opponent information from their respective sources
	const { user, userDeck, fetchUserData } = useUserStore((state) => state)
	const { selectedOpponent, selectedOpponentDeck } = useOpponentsStore(
		(state) => state
	)

	// Initialize Player One state
	const [playerOne, setPlayerOne] = useState<UserDetails>({
		user: user,
		name: 'p1',
		deck: [],
		hand: [],
		roundScore: 0,
		battleScore: 0
	})

	// Initialize Player Two state
	const [playerTwo, setPlayerTwo] = useState<CPUDetails>({
		user: selectedOpponent,
		name: 'p2',
		deck: [],
		hand: [],
		roundScore: 0,
		battleScore: 0
	})

	// Initialize Battle State
	const [battleState, setBattleState] = useState<BattleState>({
		board: [...new Array(9).fill('empty')],
		decksShuffled: false,
		handsDealt: false,
		battleStarted: false,
		round: 0,
		isP1Turn: false,
		roundStarted: false,
		roundOver: false,
		roundResults: [],
		battleOver: false
	})

	const [alertActive, setAlertActive] = useState(false)
	const [cardDragged, setCardDragged] = useState<ICard | null>(null)
	const [cardSelected, setCardSelected] = useState<ICard | null>(null)
	const [currentBattleNumber, setCurrentBattleNumber] = useState<number | null>(
		null
	)

	// Destructure Battle State
	const {
		board,
		decksShuffled,
		handsDealt,
		battleStarted,
		round,
		isP1Turn,
		roundStarted,
		roundOver,
		roundResults,
		battleOver
	} = battleState

	// Variables to track status of Player Hands and Board
	const emptyCells = board
		.map((cell, i) => {
			if (cell === 'empty') {
				return i
			}
			return null
		})
		.filter((index) => index !== null)

	// Retrieve state from local storage if it exists
	// Otherwise initialize a new game
	useEffect(() => {
		const shuffleDecks = () => {
			shuffleCards([userDeck, selectedOpponentDeck])
			updateState(setPlayerOne, { deck: [...userDeck] })
			updateState(setPlayerTwo, { deck: [...selectedOpponentDeck] })
			updateState(setBattleState, { decksShuffled: true, round: round + 1 })
		}

		// Used in the developer environment to retrieve the battle number
		const getAndSetBattleNumber = async () => {
			try {
				const battleNumber = await getCurrentBattleNumber()

				setCurrentBattleNumber(battleNumber)
			} catch (error) {
				console.error('Error fetching battle number:', error)
			}
		}

		const savedState = JSON.parse(localStorage.getItem('battleLog') as string)

		getAndSetBattleNumber()
		setTimeout(() => {
			if (savedState) {
				restoreStateFromLocalStorage(savedState)
			} else {
				// Begin process of setting up a new game
				shuffleDecks()
			}
		}, 50)
	}, [round, selectedOpponentDeck, userDeck])

	// Set state equal to state retrieve from local storage
	// Returns state to last move before page exit
	const restoreStateFromLocalStorage = (savedState: any) => {
		const lastGameState = savedState[savedState.length - 1]
		const { playerOne, playerTwo, battleState } = lastGameState
		setPlayerOne(playerOne)
		setPlayerTwo(playerTwo)
		setBattleState(battleState)
	}

	const dealHands = useCallback(() => {
		assignColorsAndDealCards(playerOne)
		assignColorsAndDealCards(playerTwo)
		updateState(setPlayerOne, {
			deck: [...playerOne.deck],
			hand: [...playerOne.hand],
			roundScore: playerOne.hand.length
		})
		updateState(setPlayerTwo, {
			deck: [...playerTwo.deck],
			hand: [...playerTwo.hand],
			roundScore: playerTwo.hand.length
		})
		setTimeout(() => {
			updateState(setBattleState, {
				handsDealt: true
			})
		}, 1500)
	}, [playerOne, playerTwo])

	// Deal cards only once decks are shuffled and a Battle is
	// not currently under way
	useEffect(() => {
		if (decksShuffled === true && battleStarted === false) {
			dealHands()
		}
	}, [decksShuffled, battleStarted, dealHands])

	// Decide who goes first only once hands have been dealt and
	// a Battle is not currently under way
	useEffect(() => {
		if (handsDealt === true && battleStarted === false) {
			updateState(setBattleState, {
				roundResults: Array.from(
					{ length: selectedOpponent!.rounds },
					(_, index) => {
						return { round: index + 1, p1Score: '', p2Score: '' }
					}
				)
			})
			randomFirstTurn()
		}
	}, [handsDealt, battleStarted, selectedOpponent])

	const randomFirstTurn = () => {
		const arrowElement = document.querySelector('.turn-arrow')
		arrowElement!.classList.add('start-game')
		setTimeout(() => {
			Math.random() < 0.5 ?
				updateState(setBattleState, { isP1Turn: true })
			:	updateState(setBattleState, { isP1Turn: false })
			arrowElement!.classList.remove('start-game')
			updateState(setBattleState, { battleStarted: true })
			updateState(setBattleState, { roundStarted: true })
		}, 1000)
	}

	const saveStateToLocalStorage = useCallback(() => {
		const battleLog =
			JSON.parse(localStorage.getItem('battleLog') as string) || []

		const playerOneData = {
			user: playerOne?.user?.username,
			name: playerOne.name,
			deck: playerOne.deck,
			hand: playerOne.hand,
			roundScore: playerOne.roundScore,
			battleScore: playerOne.battleScore
		}

		const playerTwoData = {
			user: playerTwo?.user?.name,
			name: playerTwo.name,
			deck: playerTwo.deck,
			hand: playerTwo.hand,
			roundScore: playerTwo.roundScore,
			battleScore: playerTwo.battleScore
		}

		battleLog.push({
			playerOneData,
			playerTwoData,
			battleState
		})

		localStorage.setItem('battleLog', JSON.stringify(battleLog))
	}, [playerOne, playerTwo, battleState])

	const updateScores = useCallback(() => {
		const endTurn = () => {
			setCardSelected(null)
			updateState(setBattleState, { isP1Turn: !isP1Turn })
		}

		const table = [...playerTwo.hand, ...board, ...playerOne.hand]
		let p1Score = 0
		let p2Score = 0

		table.forEach((card) => {
			if (card?.color === user?.color) {
				p1Score++
			} else if (card?.color === playerTwo.user?.color) {
				p2Score++
			}
			updateState(setPlayerOne, { roundScore: p1Score })
			updateState(setPlayerTwo, { roundScore: p2Score })
		})

		endTurn()
	}, [
		isP1Turn,
		playerOne.hand,
		playerTwo.hand,
		board,
		user?.color,
		playerTwo.user?.color
	])

	// Save state to local storage when a new game has been initialized
	useEffect(() => {
		if (battleStarted === true) {
			saveStateToLocalStorage()
		}
	}, [battleStarted, saveStateToLocalStorage])

	useEffect(() => {
		const cpuTurn = () => {
			const { move, newBoard, newHand } = cpuMove(
				playerTwo.hand,
				battleState.board,
				emptyCells
			)
			battleProcessor(move.cell, move.card, battleState)
			updateState(setPlayerTwo, { hand: newHand })
			updateState(setBattleState, { board: newBoard })
			updateScores()
		}

		const cpuCanAct =
			battleStarted &&
			roundStarted &&
			!isP1Turn &&
			emptyCells.length !== 0 &&
			playerTwo.hand.length > 0 &&
			roundOver === false

		if (cpuCanAct) {
			setTimeout(() => {
				cpuTurn()
			}, 2000)
		}
	}, [
		isP1Turn,
		roundStarted,
		playerTwo.hand.length,
		battleStarted,
		emptyCells.length,
		roundOver,
		battleState,
		emptyCells,
		playerTwo.hand,
		updateScores
	])

	useEffect(() => {
		const updateRoundResults = () => {
			const updatedRoundResults = roundResults.map((round) => {
				if (round.round === battleState.round) {
					return {
						...round,
						p1Score: playerOne.roundScore,
						p2Score: playerTwo.roundScore
					}
				}
				return round
			})
			updateState(setBattleState, { roundResults: updatedRoundResults })
		}

		const roundResult = () => {
			updateState(setPlayerOne, {
				battleScore: playerOne.battleScore + playerOne.roundScore
			})
			updateState(setPlayerTwo, {
				battleScore: playerTwo.battleScore + playerTwo.roundScore
			})
			updateRoundResults()
			setTimeout(() => {
				updateState(setBattleState, { roundStarted: false, roundOver: true })
			}, 1500)
		}

		const checkForRoundEnd = () => {
			if (emptyCells.length === 0) {
				roundResult()
			} else if (emptyCells.length < 9) {
				saveStateToLocalStorage()
			}
		}

		checkForRoundEnd()
		// Only trigger this when isSP1Turn changes
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [isP1Turn])

	useEffect(() => {
		const newRound = () => {
			updateState(setPlayerOne, { hand: [] })
			updateState(setPlayerTwo, { hand: [] })
			updateState(setBattleState, {
				board: [...new Array(9).fill('empty')],
				handsDealt: false,
				roundStarted: true,
				roundOver: false,
				round: round + 1
			})
		}

		const checkForBattleEnd = () => {
			if (
				round === selectedOpponent!.rounds ||
				playerOne.battleScore >
					playerTwo.battleScore + (selectedOpponent!.rounds - round) * 9 ||
				playerTwo.battleScore >
					playerOne.battleScore + (selectedOpponent!.rounds - round) * 9
			) {
				updateState(setBattleState, { battleOver: true })
			} else {
				newRound()
			}
		}

		if (roundOver === true) {
			setTimeout(() => {
				saveStateToLocalStorage()
				checkForBattleEnd()
			}, 3000)
		}
	}, [
		roundOver,
		saveStateToLocalStorage,
		playerOne.battleScore,
		playerTwo.battleScore,
		round,
		selectedOpponent
	])

	useEffect(() => {
		if (handsDealt === false && round > 0) {
			setTimeout(() => {
				dealHands()
			}, 1000)
		}
	}, [handsDealt, round, dealHands])

	// Remove state from local storage when the Battle is over
	useEffect(() => {
		if (battleOver === true) {
			saveStateToLocalStorage()
		}
	}, [battleOver, saveStateToLocalStorage])

	const forfeitBattle = async () => {
		const battleLog = localStorage.getItem('battleLog')
		await fetchUserData('stats')
		console.log(user!.stats)
		await postBattleLog(battleLog as string)
		localStorage.removeItem('battleLog')
		await updateUserStats(user!, 'loss')
		router.push('/opponent-select')
	}

	return (
		<div className="battle page">
			<div className="table">
				<Hand
					player={playerTwo}
					battleState={battleState}
					cardSelected={cardSelected}
					cardDragged={cardDragged}
					setCardSelected={setCardSelected}
					setCardDragged={setCardDragged}
					handsDealt={handsDealt}
				/>
				<Board
					playerOne={playerOne}
					setPlayerOne={setPlayerOne}
					playerTwo={playerTwo}
					battleState={battleState}
					setBattleState={setBattleState}
					cardSelected={cardSelected}
					cardDragged={cardDragged}
					setCardDragged={setCardDragged}
					updateScores={updateScores}
				/>
				<Hand
					player={playerOne}
					battleState={battleState}
					cardSelected={cardSelected}
					cardDragged={cardDragged}
					setCardSelected={setCardSelected}
					setCardDragged={setCardDragged}
					handsDealt={handsDealt}
				/>
			</div>
			{roundOver && !battleOver && (
				<ModalOverlay>
					<RoundResult
						playerOne={playerOne}
						playerTwo={playerTwo}
						battleState={battleState}
					/>
				</ModalOverlay>
			)}
			{battleOver && (
				<ModalOverlay>
					<BattleResults
						playerOne={playerOne}
						playerTwo={playerTwo}
					/>
				</ModalOverlay>
			)}
			{alertActive && (
				<Alert>
					<h2>Don&apos;t be a quitter!</h2>
					<div className="buttons">
						<Button
							label="Fight on!"
							onClick={() => setAlertActive(false)}
						/>
						<Button
							label="Forefeit"
							onClick={() => forfeitBattle()}
						/>
					</div>
					<p>*Forfeiting will count as a loss</p>
				</Alert>
			)}
			<p className="battle-number">bn.{currentBattleNumber}</p>
			<a
				className="hidden-button"
				onClick={() => setAlertActive(true)}
			></a>
		</div>
	)
}

export default Battle
