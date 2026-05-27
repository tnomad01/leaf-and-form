export interface PortfolioItem {
  id: string
  title: string
  location: string
  description: string
  imageUrl: string
}

export const portfolio: PortfolioItem[] = [
  {
    id: '1',
    title: 'Cottage Border',
    location: 'Somerset',
    description: 'Foxgloves, salvia and hardy geraniums layered for structure and season-long colour in soft purples and pinks.',
    imageUrl: 'https://placehold.co/800x600/7C9A7E/F7F4EE?text=Cottage+Border',
  },
  {
    id: '2',
    title: 'Modern Gravel Garden',
    location: 'London',
    description: 'Structural ornamental grasses and lavender deliver year-round interest with minimal upkeep.',
    imageUrl: 'https://placehold.co/800x600/5D7F5F/F7F4EE?text=Gravel+Garden',
  },
  {
    id: '3',
    title: 'Kitchen Garden Border',
    location: 'Yorkshire',
    description: 'Herbs, edible flowers and soft planting blur the line between ornamental and productive.',
    imageUrl: 'https://placehold.co/800x600/C9B99A/2C2C2C?text=Kitchen+Garden',
  },
  {
    id: '4',
    title: 'Wildflower Meadow',
    location: 'Wiltshire',
    description: 'Native species chosen to support pollinators while naturalising beautifully through the seasons.',
    imageUrl: 'https://placehold.co/800x600/7C9A7E/F7F4EE?text=Wildflower+Meadow',
  },
  {
    id: '5',
    title: 'Shaded Town Garden',
    location: 'Bristol',
    description: 'Hostas, ferns and hellebores thrive in a north-facing plot, delivering year-round texture and calm.',
    imageUrl: 'https://placehold.co/800x600/5D7F5F/F7F4EE?text=Shaded+Garden',
  },
  {
    id: '6',
    title: 'Coastal Planting',
    location: 'Cornwall',
    description: 'Wind-hardy sea holly, escallonia and hebes in ocean blues and silvers built to weather the elements.',
    imageUrl: 'https://placehold.co/800x600/C9B99A/2C2C2C?text=Coastal+Planting',
  },
]
