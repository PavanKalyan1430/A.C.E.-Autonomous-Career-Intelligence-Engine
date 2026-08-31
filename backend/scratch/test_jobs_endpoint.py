import asyncio
import httpx

async def test():
    async with httpx.AsyncClient(base_url='http://127.0.0.1:8000', timeout=90) as client:
        # Login
        r = await client.post(
            '/api/v1/auth/login',
            data={'username': 'sai@gmail.com', 'password': '12345678'}
        )
        print(f'Login status: {r.status_code}')
        if r.status_code != 200:
            print(f'Login error body: {r.text[:300]}')
            return

        token = r.json()['access_token']
        print(f'Token OK: {token[:25]}...')

        # Hit the jobs discover endpoint
        jobs_r = await client.get(
            '/api/v1/jobs/discover?limit=3',
            headers={'Authorization': f'Bearer {token}'}
        )
        print(f'Jobs status: {jobs_r.status_code}')

        if jobs_r.status_code == 200:
            data = jobs_r.json()
            total = data['total_count']
            jobs = data['jobs']
            print(f'total_count: {total}')
            print(f'jobs returned: {len(jobs)}')
            for j in jobs:
                print(f'  - {j["title"]} @ {j["company_name"]} | {j["location"]}')
        else:
            print(f'Jobs error: {jobs_r.text[:500]}')

asyncio.run(test())
