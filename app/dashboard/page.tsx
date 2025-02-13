"use client"

import { useState } from "react"
import { DollarSign, ShoppingBag, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"

interface Person {
  id: number
  name: string
  loss: number
}

export default function Dashboard() {
  const [people, setPeople] = useState<Person[]>([
    { id: 1, name: "Alice", loss: 10000 },
    { id: 2, name: "Bob", loss: 7500 },
    { id: 3, name: "Charlie", loss: 3000 },
  ])
  const [newName, setNewName] = useState("")
  const [newLoss, setNewLoss] = useState<number>(0)
  const averagePurseCost = 10000 // USD

  const addPerson = () => {
    if (newName && newLoss > 0) {
      setPeople([...people, { id: people.length + 1, name: newName, loss: newLoss }])
      setNewName("")
      setNewLoss(0)
    }
  }

  const calculatePurses = (loss: number) => {
    return Math.floor(loss / averagePurseCost)
  }

  const totalLoss = people.reduce((sum, person) => sum + person.loss, 0)
  const totalChemos = calculatePurses(totalLoss)

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4">
      <div className="max-w-4xl mx-auto">
        <Link href="/">
          <Button variant="ghost" className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Calculator
          </Button>
        </Link>
        <Card className="bg-gray-800 border-gray-700 mb-6">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-center text-purple-400">Investment Loss Dashboard</CardTitle>
            <CardDescription className="text-center text-gray-400">
              Track investment losses and potential chemo sessions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div className="text-center">
                <p className="text-lg text-white">Total Loss:</p>
                <p className="text-2xl font-bold text-red-400">${totalLoss.toFixed(2)}</p>
              </div>
              <div className="text-center">
                <p className="text-lg text-white">Total Chemos:</p>
                <div className="flex items-center justify-center space-x-2 text-2xl font-bold text-purple-400">
                  <ShoppingBag />
                  <span>{totalChemos}</span>
                </div>
              </div>
            </div>
            <div className="space-y-4">
              {people.map((person) => (
                <Card key={person.id} className="bg-gray-700 border-gray-600">
                  <CardContent className="flex items-center justify-between p-4">
                    <div>
                      <p className="font-semibold text-white">{person.name}</p>
                      <p className="text-sm text-gray-400">Loss: ${person.loss.toFixed(2)}</p>
                    </div>
                    <div className="flex items-center space-x-2 text-purple-400">
                      <ShoppingBag className="h-5 w-5" />
                      <span>{calculatePurses(person.loss)}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-xl font-bold text-purple-400">Add New Person</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Input
                placeholder="Name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="bg-gray-700 border-gray-600 text-white"
              />
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" />
                <Input
                  type="number"
                  placeholder="Investment Loss"
                  value={newLoss || ""}
                  onChange={(e) => setNewLoss(Number.parseFloat(e.target.value) || 0)}
                  className="pl-10 bg-gray-700 border-gray-600 text-white"
                />
              </div>
              <Button className="w-full bg-purple-600 hover:bg-purple-700" onClick={addPerson}>
                Add Person
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

