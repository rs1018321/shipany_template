export async function generateMetadata({
    params,
  }: {
    params: Promise<{ locale: string }>;
  }) {
    const { locale } = await params;
    let canonicalUrl = `${process.env.NEXT_PUBLIC_WEB_URL}`;
  
    if (locale !== "en") {
      canonicalUrl = `${process.env.NEXT_PUBLIC_WEB_URL}/${locale}`;
    }
  
    return {
      alternates: {
        canonical: canonicalUrl,
      },
    };
  }