import { TravelpayoutsScript } from '@/components/travel/TravelpayoutsScript';

type TravelpayoutsFlightWidgetProps = {
  wlId: string;
  resultsPath?: string;
  showSearch?: boolean;
  showResults?: boolean;
};

export function TravelpayoutsFlightWidget({
  wlId,
  resultsPath,
  showSearch = true,
  showResults = true,
}: TravelpayoutsFlightWidgetProps) {
  return (
    <div className="space-y-6">
      <TravelpayoutsScript wlId={wlId} resultsPath={resultsPath} />
      {showSearch && <div id="tpwl-search" className="min-h-[120px]" />}
      {showResults && <div id="tpwl-tickets" className="min-h-[200px]" />}
    </div>
  );
}