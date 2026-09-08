const body = {
  applinks: {
    apps: [],
    details: [
      {
        appID: 'G566R46HZ3.com.borabond.mobile',
        paths: ['/get-app', '/get-app/*'],
      },
    ],
  },
};

export function GET() {
  return new Response(JSON.stringify(body), {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
