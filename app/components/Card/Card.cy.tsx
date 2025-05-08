import React from 'react'
import Card from './Card'
import { ICard } from '@interfaces'

describe('<Card />', () => {
	const mockCard: ICard = {
		_id: 'card123',
		name: 'Test Card',
		image: 'image/url',
		values: [5, 6, 7, 8],
		rarity: 'Common',
		color: 'red',
		captured: false
	}

	it('renders with basic props', () => {
		cy.mount(<Card card={mockCard} />)

		// Check if the card renders
		cy.getDataCy('card').should('exist')

		// Check if the card has the correct image
		cy.getDataCy('card-image-front').first().should('have.attr', 'src', mockCard.image)

		// Check if the card values are displayed correctly
		cy.getDataCy('up').should('contain', mockCard.values[0])
		cy.getDataCy('right').should('contain', mockCard.values[1])
		cy.getDataCy('down').should('contain', mockCard.values[2])
		cy.getDataCy('left').should('contain', mockCard.values[3])
	})

	it('applies the correct classes based on props', () => {
		// Test with captured card
		const capturedCard = { ...mockCard, captured: true }

		cy.mount(<Card card={capturedCard} />)
		cy.getDataCy('card').should('have.class', 'captured')

		// Test with isDragged prop
		cy.mount(
			<Card
				card={mockCard}
				isDragged={true}
			/>
		)
		cy.getDataCy('card').should('have.class', 'is-dragged')

		// Test with isShowing prop
		cy.mount(
			<Card
				card={mockCard}
				isShowing={true}
			/>
		)
		cy.getDataCy('card').should('have.class', 'is-showing')

		// Test with isSelected prop
		cy.mount(
			<Card
				card={mockCard}
				isSelected={true}
			/>
		)
		cy.getDataCy('card').should('have.class', 'is-selected')
	})

	it('calls handleClick when clicked', () => {
		const handleClick = cy.spy().as('clickSpy')

		cy.mount(
			<Card
				card={mockCard}
				handleClick={handleClick}
			/>
		)

		cy.getDataCy('card').click()
		cy.get('@clickSpy').should('have.been.calledOnce')
	})

	it('handles drag events correctly', () => {
		const setCardDragged = cy.spy().as('setCardDraggedSpy')

		cy.mount(
			<Card
				card={mockCard}
				isDraggable={true}
				setCardDragged={setCardDragged}
			/>
		)

		// Test drag start
		cy.getDataCy('card').trigger('dragstart')
		cy.get('@setCardDraggedSpy').should('have.been.calledWith', mockCard)

		// Test drag end
		cy.getDataCy('card').trigger('dragend')
		cy.get('@setCardDraggedSpy').should('have.been.calledWith', null)
	})

	it('uses default color when color is not provided', () => {
		const cardWithoutColor = { ...mockCard, color: undefined }
		cy.mount(<Card card={cardWithoutColor} />)

		// Check if the default color is applied
		cy.getDataCy('card-front').should('have.css', 'background-color', 'rgb(3, 48, 59)')
	})

	it('renders with draggable attribute when isDraggable is true', () => {
		cy.mount(
			<Card
				card={mockCard}
				isDraggable={true}
			/>
		)
		cy.getDataCy('card').should('have.attr', 'draggable', 'true')

		cy.mount(
			<Card
				card={mockCard}
				isDraggable={false}
			/>
		)
		cy.getDataCy('card').should('not.have.attr', 'draggable', 'true')
	})

	it('handles null or undefined card gracefully', () => {
		// @ts-ignore - Intentionally testing with invalid props
		cy.mount(<Card card={null} />)
		cy.getDataCy('card').should('exist')

		// @ts-ignore - Intentionally testing with invalid props
		cy.mount(<Card card={undefined} />)
		cy.getDataCy('card').should('exist')
	})
})
