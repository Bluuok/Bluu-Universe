// Production defaults shared by the pilot, pose and regression checks.
// Distances use the retained room's world units; angles are radians.
export const FlightTuning = Object.freeze({
  movement: Object.freeze({speed:12,verticalSpeed:7,acceleration:36,steeringAcceleration:48,brake:16,brakeDamping:7.5,glideDrag:3,glideDamping:6,lookSensitivity:.0028,boundarySlowDistance:18}),
  pose: Object.freeze({thrustLean:.20,coastLean:.045,brakeLean:-.09,bank:.045,turnResponse:8,thrustResponse:7,releaseResponse:6,headCounterLean:.10}),
});
