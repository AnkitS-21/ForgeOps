import logging

from datetime import datetime, timezone
from apscheduler.schedulers.blocking import BlockingScheduler
from sqlalchemy import select

from app.db.session import SessionLocal
from app.models.service import Service, ServiceStatus
from app.services.health_monitor import check_service_health


logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s"
)

logger = logging.getLogger(__name__)


def run_scheduled_health_checks():

    logger.info("Starting scheduled health checks")

    db = SessionLocal()

    try:
        statement = select(Service).where(
            Service.endpoint_url.is_not(None),
            Service.status.in_([
                ServiceStatus.ACTIVE,
                ServiceStatus.DEGRADED
            ])
        )

        services = db.scalars(statement).all()

        logger.info("Found %s services to monitor", len(services))

        for service in services:

            try:
                result = check_service_health(db, service)

                logger.info(
                    "Service: %s | Status: %s | Response: %s ms",
                    service.name,
                    result.status,
                    result.response_time_ms
                )

            except Exception:
                db.rollback()

                logger.exception(
                    "Health check failed for service: %s",
                    service.name
                )

    finally:
        db.close()

    logger.info("Scheduled health checks completed")


scheduler = BlockingScheduler(timezone="UTC")

scheduler.add_job(
    run_scheduled_health_checks,
    trigger="interval",
    seconds=60,
    id="service_health_monitor",
    replace_existing=True,
    max_instances=1,
    coalesce=True,
    next_run_time=datetime.now(timezone.utc)
)


if __name__ == "__main__":

    logger.info("ForgeOps Background Worker starting")

    try:
        scheduler.start()

    except (KeyboardInterrupt, SystemExit):
        logger.info("ForgeOps Background Worker stopped")