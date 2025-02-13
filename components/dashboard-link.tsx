import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function DashboardLink() {
  return (
    <Link href="/dashboard">
      <Button variant="outline" className="bg-gray-700 hover:bg-gray-600 text-white">
        View Investment Loss Dashboard
      </Button>
    </Link>
  )
}