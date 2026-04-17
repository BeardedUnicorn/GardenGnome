import { PlantLibraryPanel } from '@/features/plants/PlantLibraryPanel';

export const PlantLibraryPage = () => (
  <section className="settings-layout">
    <PlantLibraryPanel
      description="Review the seeded library, maintain custom crops, and tune catalog metadata before you head back into the planner."
      heading="Plant catalog"
      placementEnabled={false}
      rootClassName="card plant-library-page__panel"
    />
  </section>
);
