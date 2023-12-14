import { useEffect } from 'react'

import { navigate, routes, useParams } from '@redwoodjs/router'

const HomePage = () => {
  const { code, state } = useParams()
  console.log({ code, state })

  useEffect(() => {
    if (code && state) {
      const getTokens = async () => {
        const res = await fetch(
          `${window.RWJS_API_URL}/auth?code=${code}&state=${state}`
        )
        if (!res.ok) {
          console.error('error')
          return
        }
        const data = await res.json()
        console.log(data)

        navigate(routes.home(), { replace: true })
      }
      getTokens()
    }
  }, [code, state])

  const callAuth = async () => {
    const res = await fetch(`${window.RWJS_API_URL}/auth`)
    if (!res.ok) {
      console.error('error')
      return
    }

    const data = await res.json()
    console.log(data)

    window.location.href = data.authUrl
  }

  return (
    <>
      <button onClick={callAuth}>click</button>
    </>
  )
}

export default HomePage
