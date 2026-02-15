import asyncio
import httpx
import time

async def test_rate_limit(url: str, total_requests: int):
    print(f" Starting verification on {url}")
    print(f" Sending {total_requests} requests...")
    
    start_time = time.perf_counter()
    async with httpx.AsyncClient() as client:
        tasks = [client.get(url) for _ in range(total_requests)]
        responses = await asyncio.gather(*tasks, return_exceptions=True)
    
    end_time = time.perf_counter()
    
    # Results analysis
    stats = {
        "success": 0,    # 2xx
        "throttled": 0,  # 429
        "error": 0,      # Others
        "exceptions": 0
    }
    
    for resp in responses:
        if isinstance(resp, httpx.Response):
            if 200 <= resp.status_code < 300:
                stats["success"] += 1
            elif resp.status_code == 429:
                stats["throttled"] += 1
            else:
                stats["error"] += 1
        else:
            stats["exceptions"] += 1

    print("\n--- Results ")
    print(f"Total Time: {end_time - start_time:.2f}s")
    print(f"Successful (2xx): {stats['success']}")
    print(f"Throttled (429):  {stats['throttled']}  <-- This confirms rate limiting is working!")
    print(f"Other Errors:     {stats['error']}")
    print(f"Exceptions:       {stats['exceptions']}")

if __name__ == "__main__":
    # Run: python test-rate-limit.py <URL> <COUNT>
    import sys
    
    target_url = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:3000/api/projects"
    count = int(sys.argv[2]) if len(sys.argv) > 2 else 50
    
    asyncio.run(test_rate_limit(target_url, count))
