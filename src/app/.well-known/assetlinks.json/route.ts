const body = [
  {
    relation: ['delegate_permission/common.handle_all_urls'],
    target: {
      namespace: 'android_app',
      package_name: 'com.borabond.mobile',
      sha256_cert_fingerprints: [
        '2A:60:E2:07:68:EE:1E:07:48:DE:EB:95:E0:13:7B:93:B9:77:D4:0D:8B:26:EA:B3:C5:4C:34:34:FE:51:CC:BF',
      ],
    },
  },
];

export function GET() {
  return new Response(JSON.stringify(body), {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
