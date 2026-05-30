/** Fine-grained Train Station intents (explicit slots). */
export type TrainStationGoalId =
  | 'ASK_DESTINATION'
  | 'ASK_DEPARTURE_TIME'
  | 'ASK_PLATFORM'
  | 'ASK_DELAY_STATUS'
  | 'CONFIRM_DETAIL'
  | 'THANK_AND_CLOSE'

export const ALL_TRAIN_STATION_GOALS: readonly TrainStationGoalId[] = [
  'ASK_DESTINATION',
  'ASK_DEPARTURE_TIME',
  'ASK_PLATFORM',
  'ASK_DELAY_STATUS',
  'CONFIRM_DETAIL',
  'THANK_AND_CLOSE',
] as const
