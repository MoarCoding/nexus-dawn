import { useUserStore } from '@stores'
import Avatar from './Avatar'

describe('<Avatar />', () => {
	const imgUrl = 'url.to.som.image'

	it('renders the avatar with user data', () => {
		useUserStore.setState({
			user: {
				image: imgUrl,
				level: 5,
				color: '#ff0000'
			}
		})

		cy.mount(<Avatar levelShowing={true} />)

		// Assert that the avatar image is rendered
		cy.get('img[alt="user image"]').should('have.attr', 'src', imgUrl)

		cy.contains(/LVL\s+5/).should('be.visible')
	})

	it('renders without crashing when user is null', () => {
		// Update the Zustand store to return null for the user
		useUserStore.setState({
			user: null
		})

		cy.mount(<Avatar levelShowing={true} />)

		// Assert that the component renders without crashing
		cy.get('.avatar').should('exist')
	})
})
