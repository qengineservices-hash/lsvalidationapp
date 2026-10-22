export function getValidationPayload(validationData: any) {
  return validationData?.validation_data || validationData || {};
}

export function getValidationFormData(validationData: any) {
  const payload = getValidationPayload(validationData);
  return payload?.formData || payload || {};
}

export function getValidationRooms(validationData: any) {
  return getValidationFormData(validationData)?.rooms || {};
}

export function getValidationRoomOrder(validationData: any): string[] {
  return getValidationFormData(validationData)?.roomOrder || [];
}

export function normalizeQuoteStatus(status?: string | null) {
  if (!status) return "";
  if (status === "pending_vm_review") return "pending_vm_approval";
  return status;
}

export function isPendingVmApproval(status?: string | null) {
  return normalizeQuoteStatus(status) === "pending_vm_approval";
}
