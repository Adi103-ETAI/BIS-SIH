"""RQ worker entrypoint. Jobs land here from Stage 3 (ingestion/embed). Not run in Stage 1."""

# from redis import Redis
# from rq import Worker
#
# def main() -> None:
#     Worker(["default"], connection=Redis.from_url("redis://localhost:6379/0")).work()
#
# if __name__ == "__main__":
#     main()
