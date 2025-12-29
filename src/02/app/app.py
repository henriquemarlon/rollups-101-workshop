import json
import logging
import sqlite3

from cmpy import Rollup

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

conn = sqlite3.connect("/mnt/data/sqlite.db")


def handle_advance(rollup: Rollup) -> bool:
    advance = rollup.read_advance_state()
    msg_sender = advance["msg_sender"].hex().lower()
    logger.info(f"Received advance request from {msg_sender=}")

    try:
        statement = advance["payload"]["data"].decode("utf-8")
        logger.info(f"Processing statement: '{statement}'")

        cur = conn.cursor()
        cur.execute(statement)
        result = cur.fetchall()

        if result:
            payload = json.dumps(result).encode("utf-8")
            rollup.emit_notice(payload)
            logger.info(f"Emitted notice with result: {result}")

        return True

    except sqlite3.Error as e:
        msg = f"Database error executing '{statement}': {e}"
        rollup.emit_report(msg.encode("utf-8"))
        logger.error(msg)
        return False

    except Exception as e:
        msg = f"Error processing advance data: {e}"
        rollup.emit_report(msg.encode("utf-8"))
        logger.error(msg)
        return False


def handle_inspect(rollup: Rollup) -> bool:
    inspect = rollup.read_inspect_state()
    logger.info("Received inspect request")

    try:
        statement = inspect["payload"]["data"].decode("utf-8")
        logger.info(f"Processing statement: '{statement}'")

        cur = conn.cursor()
        cur.execute(statement)
        result = cur.fetchall()

        if result:
            payload = json.dumps(result).encode("utf-8")
            rollup.emit_report(payload)
            logger.info(f"Emitted report with result: {result}")

        return True

    except Exception as e:
        msg = f"Error processing inspect: {e}"
        rollup.emit_report(msg.encode("utf-8"))
        logger.error(msg)
        return True


handlers = {
    "advance": handle_advance,
    "inspect": handle_inspect,
}


if __name__ == "__main__":
    rollup = Rollup()
    accept_previous_request = True

    while True:
        logger.info("[app] Sending finish")

        next_request_type = rollup.finish(accept_previous_request)

        logger.info(f"[app] Received input of type {next_request_type}")

        accept_previous_request = handlers[next_request_type](rollup)