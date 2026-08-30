export interface Listing {
  id: string;
  name: string;
  instagram: string;
  website: string | null;
  description: string;
  imageUrl: string | null;
  currentBid: number;
  bidCount: number;
  rank?: number;
  createdAt?: string;
}
