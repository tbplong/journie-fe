import { Adaptive } from '../sections/Adaptive'
import { Cta } from '../sections/Cta'
import { Explore } from '../sections/Explore'
import { Hero } from '../sections/Hero'
import { HighlightsBar } from '../sections/HighlightsBar'
import { HowItWorks } from '../sections/HowItWorks'
import { SampleItinerary } from '../sections/SampleItinerary'
import { Story } from '../sections/Story'

export function LandingPage() {
  return (
    <>
      <Hero />
      <HighlightsBar />
      <Story />
      <HowItWorks />
      <SampleItinerary />
      <Adaptive />
      <Explore />
      <Cta />
    </>
  )
}
