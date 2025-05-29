import { getLandingPage } from "@/services/page"
import PageContent from "./PageContent"

export default async function Page({ params }: { params: { locale: string } }) {
  const page = await getLandingPage(params.locale)

  return <PageContent page={page} locale={params.locale} />
}