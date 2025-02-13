"use client"

import { useState } from "react"
import { DollarSign } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import ResultsDisplay from "./ResultsDisplay"
import DashboardLink from "@/components/dashboard-link" 

export default function Calculator() {
  const [investmentLoss, setInvestmentLoss] = useState<number>(0)
  const [walletAddress, setWalletAddress] = useState<string>("")
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [error, setError] = useState<string>("")
  const chemoSessionCost = 10000 // USD per session

  const fetchWalletLosses = async () => {
    if (!walletAddress) {
      setError("Please enter a wallet address")
      return
    }
    
    setIsLoading(true)
    setError("")
    
    try {
      const response = await fetch(`/api/get-wallet-losses?wallet_address=${encodeURIComponent(walletAddress)}`)
      const data = await response.json()
      
      if (data.error) {
        setError(data.error)
      } else {
        setInvestmentLoss(data.losses || 0)
        setError("")
      }
    } catch (err) {
      setError("Failed to fetch wallet losses")
    } finally {
      setIsLoading(false)
    }
  }

  const calculateChemoSessions = (loss: number) => {
    return Math.floor(loss / chemoSessionCost)
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-4">
      <Card className="w-full max-w-md bg-gray-800 border-gray-700 mb-4">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center text-purple-400">
            Investment Loss Calculator
          </CardTitle>
          <CardDescription className="text-center text-gray-400">
            Find out how many chemo sessions you could have gotten instead
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="relative">
              <Input
                placeholder="Enter your wallet address"
                className="bg-gray-700 border-gray-600 text-white"
                value={walletAddress}
                onChange={(e) => setWalletAddress(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    fetchWalletLosses()
                  }
                }}
              />
            </div>
            <Button 
              className="w-full bg-purple-600 hover:bg-purple-700" 
              onClick={fetchWalletLosses}
              disabled={isLoading}
            >
              {isLoading ? "Calculating..." : "Calculate"}
            </Button>
            {error && (
              <p className="text-red-400 text-center">{error}</p>
            )}
            {investmentLoss > 0 && (
              <ResultsDisplay
                investmentLoss={investmentLoss}
                chemoSessionCost={chemoSessionCost}
                chemoSessions={calculateChemoSessions(investmentLoss)} // Fixed prop name
              />
            )}
          </div>
        </CardContent>
      </Card>
      <DashboardLink />
    </div>
  )
}