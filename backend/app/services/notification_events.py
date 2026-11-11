"""
Notification event type codes and integration examples.

Call create_notification() from the existing business service while its
database transaction is still open. Do not commit inside create_notification().
"""

from app.services.notification_service import create_notification


class NotificationType:
    REQUEST_CREATED = "REQUEST_CREATED"
    QUOTATION_SENT = "QUOTATION_SENT"
    QUOTATION_APPROVED = "QUOTATION_APPROVED"
    QUOTATION_DECLINED = "QUOTATION_DECLINED"
    SCHEDULE_PROPOSED = "SCHEDULE_PROPOSED"
    SCHEDULE_APPROVED = "SCHEDULE_APPROVED"
    JOB_COMPLETED = "JOB_COMPLETED"
    PAYMENT_RECORDED = "PAYMENT_RECORDED"
    PROVIDER_APPROVED = "PROVIDER_APPROVED"
    PROVIDER_REJECTED = "PROVIDER_REJECTED"
    PROVIDER_SUSPENDED = "PROVIDER_SUSPENDED"


# Integration pattern (adapt variable names to the existing service):
#
# 1) New request -> provider:
# create_notification(
#     db,
#     user_id=provider_owner_user.id,
#     title="New service request",
#     message=f"A new {service_name} request has been submitted.",
#     notification_type=NotificationType.REQUEST_CREATED,
# )
# db.commit()  # one commit for both request + notification
#
# 2) Quotation sent -> client:
# create_notification(
#     db,
#     user_id=request.client_id,
#     title="Quotation received",
#     message="A provider has sent you a quotation.",
#     notification_type=NotificationType.QUOTATION_SENT,
# )
#
# 3) Quotation approved/declined -> provider owner:
# use QUOTATION_APPROVED or QUOTATION_DECLINED and the provider owner's user_id.
#
# 4) Schedule proposed -> client:
# use SCHEDULE_PROPOSED and the request/job client's user_id.
#
# 5) Schedule approved -> assigned worker/provider:
# use SCHEDULE_APPROVED and the assigned worker's user_id or provider owner's
# user_id, according to the existing assignment model and agreed recipient rule.
#
# 6) Job completed -> client:
# use JOB_COMPLETED and the job client's user_id.
#
# 7) Payment recorded -> provider owner:
# use PAYMENT_RECORDED and the provider owner's user_id.
#
# 8) Provider approved/rejected/suspended -> provider owner:
# use the matching provider status type and the provider owner's user_id.
#
# Transaction rule:
# - Add the notification before the existing business transaction commits.
# - If the business operation fails, roll back the notification too.
# - Do not call db.commit() separately for each notification.
