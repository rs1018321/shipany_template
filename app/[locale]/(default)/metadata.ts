export async function generateMetadata({
    params,
  }: {
    params: { locale: string };
  }) {
    const { locale } = params;
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