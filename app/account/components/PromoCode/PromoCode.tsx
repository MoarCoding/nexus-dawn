"use client"

import { useState } from "react"

import { addCoin, addExperience } from "@api"
import { Button, TextInput } from "@components"
import { User } from "@interfaces"
import { useUserStore } from "@stores"

import { checkPromoCode } from "./utils"
import "./promoCode.scss"

const PromoCode = () => {
    const user = useUserStore((state) => state.user)
    const fetchUserData = useUserStore((state) => state.fetchUserData)

    const [promoCode, setPromoCode] = useState("")
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setError("") // Clear any previous errors
        setPromoCode(e.target.value)
    }

    const handleSubmit = async () => {
        setLoading(true)
        try {
            await checkPromoCode(promoCode)
            await addCoin(user as User, 1000000)
            await addExperience(user as User, 100000) // Refresh user data after updating
            fetchUserData("coin")
            fetchUserData("xp")
        } catch (error: any) {
            setError(error.message) // Set the error message for display
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className='promo-code'>
            <h1>Promo Code</h1>
            <div className='box center-column'>
                <TextInput
                    label='Enter promo code here'
                    name='promoCode'
                    value={promoCode}
                    onChange={handleInputChange}
                    loading={loading}
                />
                {error && <p className='error'>{error}</p>}
                <Button label='Try that one' onClick={handleSubmit} disabled={promoCode.length === 0 || loading} />
            </div>
        </div>
    )
}

export default PromoCode
