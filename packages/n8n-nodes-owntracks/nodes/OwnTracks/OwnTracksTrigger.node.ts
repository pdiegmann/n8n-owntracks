import {
  INodeType,
  INodeTypeDescription,
  ITriggerFunctions,
  ITriggerResponse,
  IDataObject,
  NodeConnectionType,
} from 'n8n-workflow';

export class OwnTracksTrigger implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'OwnTracks Trigger',
    name: 'ownTracksTrigger',
    icon: 'file:owntracks.svg',
    group: ['trigger'],
    version: 1,
    subtitle: '={{$parameter["event"]}}',
    description: 'Triggers on new OwnTracks location updates',
    defaults: {
      name: 'OwnTracks Trigger',
    },
    inputs: [],
    outputs: [NodeConnectionType.Main],
    credentials: [
      {
        name: 'ownTracksApi',
        required: true,
      },
    ],
    polling: true,
    properties: [
      {
        displayName: 'Event',
        name: 'event',
        type: 'options',
        options: [
          {
            name: 'New Location',
            value: 'newLocation',
            description: 'Trigger on any new location update',
          },
          {
            name: 'Significant Movement',
            value: 'significantMovement',
            description: 'Trigger only when location changes significantly',
          },
        ],
        default: 'newLocation',
        description: 'Type of event to trigger on',
      },
      {
        displayName: 'Device Filter',
        name: 'deviceFilter',
        type: 'string',
        default: '',
        placeholder: 'device-name',
        description: 'Filter by specific device (leave empty for all devices)',
      },
      {
        displayName: 'Minimum Distance (meters)',
        name: 'minDistance',
        type: 'number',
        default: 100,
        displayOptions: {
          show: {
            event: ['significantMovement'],
          },
        },
        description: 'Minimum distance in meters to trigger event',
      },
      {
        displayName: 'Poll Interval (seconds)',
        name: 'pollInterval',
        type: 'number',
        default: 60,
        description: 'How often to check for new locations (in seconds)',
      },
    ],
  };

  async trigger(this: ITriggerFunctions): Promise<ITriggerResponse> {
    const event = this.getNodeParameter('event') as string;
    const deviceFilter = this.getNodeParameter('deviceFilter', '') as string;
    const minDistance = this.getNodeParameter('minDistance', 100) as number;
    const pollInterval = this.getNodeParameter('pollInterval', 60) as number;

    const credentials = await this.getCredentials('ownTracksApi');
    const backendUrl = credentials.backendUrl as string;

    let lastLocationId = 0;
    let lastPosition: { lat: number; lon: number } | null = null;

    const pollFunction = async () => {
      try {
        // Build query params
        const params = new URLSearchParams({
          limit: '100',
        });
        if (deviceFilter) {
          params.append('device', deviceFilter);
        }

        // Fetch locations from backend
        const response = await this.helpers.httpRequest({
          method: 'GET',
          url: `${backendUrl}/locations?${params.toString()}`,
          returnFullResponse: true,
        });

        const data = response.body as { success: boolean; count: number; data: any[] };

        if (data.success && data.data && data.data.length > 0) {
          // Process new locations
          const newLocations = data.data.filter((loc: any) => loc.id > lastLocationId);

          for (const location of newLocations) {
            let shouldTrigger = false;

            if (event === 'newLocation') {
              shouldTrigger = true;
            } else if (event === 'significantMovement') {
              if (!lastPosition) {
                shouldTrigger = true;
              } else {
                const distance = calculateDistance(
                  lastPosition.lat,
                  lastPosition.lon,
                  location.lat,
                  location.lon
                );
                shouldTrigger = distance >= minDistance;
              }
            }

            if (shouldTrigger) {
              lastPosition = { lat: location.lat, lon: location.lon };
              
              // Parse raw_json if it exists
              let parsedData = location;
              if (location.raw_json) {
                try {
                  parsedData = { ...location, ...JSON.parse(location.raw_json) };
                } catch (error) {
                  // If parsing fails, keep original
                }
              }

              this.emit([this.helpers.returnJsonArray([parsedData as IDataObject])]);
            }

            // Update last seen ID
            if (location.id > lastLocationId) {
              lastLocationId = location.id;
            }
          }
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        this.logger.error(`OwnTracks Trigger error: ${errorMessage}`);
      }
    };

    // Initial poll
    await pollFunction();

    // Set up polling interval
    const intervalId = setInterval(pollFunction, pollInterval * 1000);

    // Return cleanup function
    async function closeFunction() {
      clearInterval(intervalId);
    }

    return {
      closeFunction,
    };
  }
}

/**
 * Calculate distance between two coordinates using Haversine formula
 * Returns distance in meters
 */
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}
