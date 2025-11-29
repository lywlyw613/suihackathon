import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const provider = searchParams.get('provider')

  if (!provider) {
    return NextResponse.json(
      { error: 'Provider is required' },
      { status: 400 }
    )
  }

  let configured = false

  switch (provider) {
    case 'github':
      configured = !!(
        process.env.GITHUB_CLIENT_ID &&
        process.env.GITHUB_CLIENT_SECRET &&
        process.env.GITHUB_CLIENT_ID !== '' &&
        process.env.GITHUB_CLIENT_SECRET !== ''
      )
      break
    case 'google':
      configured = !!(
        process.env.GOOGLE_CLIENT_ID &&
        process.env.GOOGLE_CLIENT_SECRET &&
        process.env.GOOGLE_CLIENT_ID !== '' &&
        process.env.GOOGLE_CLIENT_SECRET !== ''
      )
      break
    case 'facebook':
      configured = !!(
        process.env.FACEBOOK_CLIENT_ID &&
        process.env.FACEBOOK_CLIENT_SECRET &&
        process.env.FACEBOOK_CLIENT_ID !== '' &&
        process.env.FACEBOOK_CLIENT_SECRET !== ''
      )
      break
  }

  return NextResponse.json({ configured })
}



