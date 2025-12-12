'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function Home() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (token) {
      setIsAuthenticated(true)
    }
  }, [])

  if (!isAuthenticated) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-24">
        <h1 className="text-4xl font-bold mb-8">Welcome to Memorang</h1>
        <div className="flex gap-4">
          <Link href="/login" className="rounded bg-blue-600 px-6 py-3 text-white hover:bg-blue-700">
            Login
          </Link>
          <Link href="/register" className="rounded border border-blue-600 px-6 py-3 text-blue-600 hover:bg-blue-50">
            Register
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-6 py-16">
      <div className="w-full max-w-2xl rounded-2xl bg-white p-8 shadow-lg">
        <div className="mb-6 text-center">
          <h1 className="text-3xl font-semibold text-gray-900">Upload your study PDF</h1>
          <p className="mt-2 text-sm text-gray-600">
            We&apos;ll securely store your PDF in Google Cloud Storage and process it for study notes.
          </p>
        </div>

        <div className="space-y-4">
          <label className="block text-sm font-medium text-gray-700" htmlFor="pdf-upload">
            Select a PDF file
          </label>
          <input
            id="pdf-upload"
            type="file"
            accept="application/pdf"
            onChange={handleFileChange}
            className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none"
          />

          <button
            type="button"
            onClick={uploadFile}
            disabled={!file}
            className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-md transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-200"
          >
            {file ? 'Upload to Google Cloud' : 'Choose a PDF to upload'}
          </button>

          {status && <p className="text-sm text-green-700">{status}</p>}
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
      </div>
    </main>
  )
}