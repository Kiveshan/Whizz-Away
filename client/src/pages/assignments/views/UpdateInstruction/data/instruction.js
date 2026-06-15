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

export const fetchShipmentType = async ({ API_BASE_URL, instructionId, setShipmentType }) => {
  if (instructionId) {
    try {
      const response = await fetch(
        `${API_BASE_URL}/instructions/${instructionId}/shipment-type`
      );
      if (!response.ok) {
        throw new Error("Failed to fetch shipment type");
      }
      const data = await response.json();
      setShipmentType(data.shipment_type);
      console.log("Shipment type:", data.shipment_type);
    } catch (error) {
      console.error("Error fetching shipment type:", error);
    }
  }
};
