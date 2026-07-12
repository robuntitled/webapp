import { TravelpayoutsScript } from '@/components/travel/TravelpayoutsScript';

type TravelpayoutsFlightWidgetProps = {
  wlId: string;
  resultsPath?: string;
  flightSearch?: string | null;
  showSearch?: boolean;
  showResults?: boolean;
  className?: string;
};

export function TravelpayoutsFlightWidget({
  wlId,
  resultsPath,
  flightSearch,
  showSearch = true,
  showResults = true,
  className = '',
}: TravelpayoutsFlightWidgetProps) {
  return (
    <div className={`space-y-4 ${className}`}>
      <TravelpayoutsScript wlId={wlId} resultsPath={resultsPath} flightSearch={flightSearch} />
      {showSearch && <div id="tpwl-search" className="min-h-[100px]" />}
      {showResults && <div id="tpwl-tickets" className="min-h-[180px]" />}
    </div>
  );
}