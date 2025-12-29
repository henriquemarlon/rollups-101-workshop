import logging
from cmpy import Rollup

logging.basicConfig(level="INFO")
logger = logging.getLogger(__name__)

def handle_advance(rollup):
    advance = rollup.read_advance_state()
    msg_sender = advance['msg_sender'].hex().lower()
    logger.info(f"Received advance request from {msg_sender=}")

    try:
        payload = advance['payload']['data'].decode("utf-8")
        result = payload.upper()
        rollup.emit_notice(result.encode("utf-8"))
        logger.info(f"Emitted notice with the input transformed to uppercase: {result}")
        return True
    
    except Exception as e:
        msg = f"Error processing advance: {e}"
        rollup.emit_report(msg.encode("utf-8"))
        logger.error(msg)
        return False

def handle_inspect(rollup):
    inspect = rollup.read_inspect_state()
    logger.info(f"Received inspect request")

    try:
        payload = inspect['payload']['data'].decode("utf-8")
        result = payload.upper()
        rollup.emit_report(result.encode("utf-8"))
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