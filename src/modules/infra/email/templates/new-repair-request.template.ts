import { NewRepairRequestJobPayload } from '../email.types';

export function BuildNewRepairRequestEmail(
  payload: NewRepairRequestJobPayload,
): {
  subject: string;
  html: string;
} {
  return {
    subject: `New repair request: ${payload.categoryName} in ${payload.cityName}`,
    html: `<p>Hi ${payload.providerName},</p><p>A new repair request was posted in ${payload.categoryName} (${payload.cityName}) that matches the categories you service.</p><p><a href="${payload.previewUrl}">View the request</a></p>`,
  };
}
