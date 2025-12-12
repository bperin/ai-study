'use client'

import { ChangeEvent, useMemo, useState } from 'react'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000'

export default function Home() {
  const [file, setFile] = useState<File | null>(null)
  const [status, setStatus] = useState<string>('')
  const [error, setError] = useState<string>('')

  const token = useMemo(
    () => (typeof window !== 'undefined' ? localStorage.getItem('access_token') : null),
    [],
  )

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0]
    setFile(selectedFile ?? null)
    setError('')
    setStatus('')
  }

  const requestSignedUrl = async () => {
    if (!file) {
      throw new Error('No file selected')
    }

    const response = await fetch(`${API_BASE_URL}/uploads/sign`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        fileName: file.name,
        contentType: file.type || 'application/pdf',
      }),
    })

    if (!response.ok) {
      throw new Error('Unable to create an upload URL')
    }

    return response.json() as Promise<{
      uploadUrl: string
      filePath: string
      expiresAt: string
    }>
  }

  const uploadFile = async () => {
    setError('')
    setStatus('Creating secure upload URL...')

    try {
      const { uploadUrl, filePath } = await requestSignedUrl()
      setStatus('Uploading your PDF to Google Cloud Storage...')

      const uploadResponse = await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': file?.type || 'application/pdf',
        },
        body: file,
      })

      if (!uploadResponse.ok) {
        throw new Error('Upload failed')
      }

      setStatus(`Upload complete! Stored at: ${filePath}`)
    } catch (err) {
      console.error(err)
      setError('We could not upload your file. Please try again.')
      setStatus('')
    }
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