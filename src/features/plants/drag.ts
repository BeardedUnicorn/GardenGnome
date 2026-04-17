import type { DragEvent } from 'react';

export const plantDragMimeType = 'application/x-gardengnome-plant-id';

export const getDraggedPlantId = (event: Pick<DragEvent, 'dataTransfer'>) =>
  event.dataTransfer.getData(plantDragMimeType) ||
  event.dataTransfer.getData('text/plain');

export const setDraggedPlantId = (
  event: Pick<DragEvent, 'dataTransfer'>,
  plantId: string,
) => {
  event.dataTransfer.effectAllowed = 'copy';
  event.dataTransfer.setData(plantDragMimeType, plantId);
  event.dataTransfer.setData('text/plain', plantId);
};
