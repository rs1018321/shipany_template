import { getLandingPage } from "@/services/page"
import PageContent from "./PageContent"

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const page = await getLandingPage(locale)

  return <PageContent page={page} locale={locale} />
}