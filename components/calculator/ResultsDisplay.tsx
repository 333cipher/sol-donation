"use client"

import { DollarSign } from "lucide-react"

export default function ResultsDisplay({
  investmentLoss,
  chemoSessionCost,
  chemoSessions // Now receives number instead of function
}: {
  investmentLoss: number
  chemoSessionCost: number
  chemoSessions: number
}) {
  return (
    <div className="text-center space-y-2">
      <div className="flex items-center justify-center space-x-2">
        <p className="text-lg text-white">Your investment loss: </p>
        <DollarSign className="h-5 w-5 text-red-400" />
        <span className="font-bold text-red-400 text-lg">
          {investmentLoss.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
        </span>
      </div>
      <p className="text-lg text-white">You could have gotten:</p>
      <div className="flex items-center justify-center space-x-2 text-2xl font-bold text-purple-400">
        <span>{chemoSessions} chemo sessions</span>
      </div>
      <p className="text-sm text-gray-400">
        (Based on an average chemo session cost of ${chemoSessionCost.toLocaleString()})
      </p>
    </div>
  )
}