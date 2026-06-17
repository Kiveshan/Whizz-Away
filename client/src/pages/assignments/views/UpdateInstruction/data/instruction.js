export const checkIfWeightBased = async ({
  api,
  instructionId,
  setRateWeight,
  setIsWeightBased,
  setWeightUnit,
}) => {
  if (!instructionId) return;

  try {
    const response = await api.get(`/instructions/${instructionId}/details`);
    const rateWeightValue = response.data.rateweight;

    console.log('Rate weight value:', rateWeightValue);
    setRateWeight(rateWeightValue);

    const isWeight = rateWeightValue && rateWeightValue.toLowerCase() !== 'container';
    setIsWeightBased(isWeight);

    if (isWeight) {
      const unit = rateWeightValue.toLowerCase().includes('ton') ? 'ton' : 'kg';
      setWeightUnit(unit);
      console.log(`Weight-based instruction detected. Unit: ${unit}`);
    }
  } catch (error) {
    console.error('Error checking rate weight:', error);
  }
};

// Pulls the KSM DN Numbers (ksm_dm_no) from the instruction's weight table rows.
// Used to populate the per-driver DN dropdown for cross-haul break bulk (shipment type 4).
export const fetchDnOptions = async ({ api, instructionId, setDnOptions }) => {
  if (!instructionId) return;

  try {
    const response = await api.get(`/api/instructions/instruction/${instructionId}`);
    const weightRows = response.data?.weight_rows;

    if (!Array.isArray(weightRows)) {
      setDnOptions([]);
      return;
    }

    const dnNumbers = [
      ...new Set(
        weightRows
          .map((row) => (row.ksm_dm_no != null ? row.ksm_dm_no.toString().trim() : ""))
          .filter((dn) => dn !== "")
      ),
    ];

    console.log("DN options from weight rows:", dnNumbers);
    setDnOptions(dnNumbers);
  } catch (error) {
    console.error("Error fetching DN options:", error);
    setDnOptions([]);
  }
};

export const fetchShipmentType = async ({ api, instructionId, setShipmentType }) => {
  if (instructionId) {
    try {
      // Use the authenticated `api` axios instance (not raw fetch) so the JWT
      // Bearer token is attached — the SaaS route requires verifyToken, and a
      // raw fetch would 401 and leave shipmentType unset (hiding the break-bulk
      // DN picker, which is gated on shipmentType === 4).
      const response = await api.get(
        `/instructions/${instructionId}/shipment-type`
      );
      setShipmentType(response.data.shipment_type);
      console.log("Shipment type:", response.data.shipment_type);
    } catch (error) {
      console.error("Error fetching shipment type:", error);
    }
  }
};
