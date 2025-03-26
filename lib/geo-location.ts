interface Country {
  code: string
  name: string
}

export async function detectUserCountry(): Promise<Country | null> {
  try {
    const response = await fetch("https://ipapi.co/json/")
    const data = await response.json()

    if (data && data.country) {
      return {
        code: data.country,
        name: data.country_name,
      }
    }

    return null
  } catch (error) {
    console.error("Error detecting country:", error)
    return null
  }
}

