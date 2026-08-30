import { prisma } from "./prisma";

export const BID_INCREMENT = 100;

/**
 * Required next bid = current highest successful bid across ALL listings + 100.
 * If no successful bids exist yet, the first valid bid is 100.
 * This is always computed server-side. The frontend value is a display hint only.
 */
export async function getCurrentHighestBid(): Promise<number> {
  const top = await prisma.listing.findFirst({
    where: { active: true },
    orderBy: { currentBid: "desc" },
    select: { currentBid: true },
  });
  return top?.currentBid ?? 0;
}

export async function getRequiredNextBid(): Promise<number> {
  const highest = await getCurrentHighestBid();
  return highest + BID_INCREMENT;
}
