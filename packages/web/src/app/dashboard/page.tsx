'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export default function DashboardPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)

  const handleLogout = useCallback(() => {
    localStorage.removeItem('access_token')
    router.push('/login')
  }, [router])

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (!token) {
      router.push('/login')
    } else {
      setLoading(false)
    }
  }, [router])

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center">Loading...</div>
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex h-16 items-center justify-between border-b bg-white px-6">
        <h1 className="text-2xl font-semibold">Memorang</h1>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-sm font-medium">Alex Learner</p>
            <p className="text-xs text-muted-foreground">alex@example.com</p>
          </div>
          <Avatar>
            <AvatarImage src="/avatars/01.png" alt="@user" />
            <AvatarFallback>AL</AvatarFallback>
          </Avatar>
        </div>
      </header>
      <div className="flex flex-1">
        <aside className="flex w-64 flex-col border-r bg-white p-6">
          <nav className="space-y-1">
            <Button variant="secondary" className="w-full justify-start">
              Dashboard
            </Button>
            <Button
              variant="ghost"
              className="w-full justify-start"
              onClick={() => router.push('/upload')}
            >
              Uploads
            </Button>
            <Button variant="ghost" className="w-full justify-start">
              Tests
            </Button>
            <Button variant="ghost" className="w-full justify-start">
              Settings
            </Button>
          </nav>
          <div className="mt-auto pt-6">
            <Button variant="outline" className="w-full" onClick={handleLogout}>
              Logout
            </Button>
          </div>
        </aside>
        <main className="flex-1 space-y-4 bg-muted/40 p-8 pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Dashboard</p>
              <h2 className="text-3xl font-bold tracking-tight">Overview</h2>
            </div>
            <Button onClick={() => router.push('/upload')}>
              Upload New PDF
            </Button>
          </div>
          <Tabs defaultValue="tests" className="space-y-4">
            <TabsList>
              <TabsTrigger value="tests">Available Tests</TabsTrigger>
              <TabsTrigger value="history">History</TabsTrigger>
            </TabsList>
            <TabsContent value="tests" className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Sample PDF Test</CardTitle>
                    <CardDescription>Generated from sample.pdf</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p>Contains 10 MCQs based on the uploaded document.</p>
                  </CardContent>
                  <CardFooter>
                    <Button className="w-full">Start Test</Button>
                  </CardFooter>
                </Card>
              </div>
            </TabsContent>
            <TabsContent value="history" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Recent Activity</CardTitle>
                  <CardDescription>Your past test results.</CardDescription>
                </CardHeader>
                <CardContent>
                  <p>No attempts yet.</p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </div>
  )
}
