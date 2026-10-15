export const getReservationDateState = (setting, count = setting?.reservationCount ?? 0) => {
  const maxReservations = setting?.maxReservations ?? null;
  return {
    maxReservations,
    reservationCount: count,
    isClosed: !!setting && maxReservations === null,
    isFull: maxReservations !== null && count >= maxReservations,
  };
};

export const getReservationCapacityMessage = (maxReservations) =>
  `この日は健診予約が上限（${maxReservations}人）に達しています。別の日付を選択してください。`;
