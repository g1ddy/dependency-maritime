import { type Node } from '@xyflow/react';

/**
 * Checks if the center of the inner node is strictly inside the bounding box of the outer node.
 *
 * @param innerNode The node being dragged/checked (must have positionAbsolute and measured dimensions or width/height)
 * @param outerNode The candidate container group (must have positionAbsolute and measured dimensions or width/height)
 * @returns true if the center point of innerNode is within the rectangle of outerNode
 */
export function isNodeCenterInside(innerNode: Node, outerNode: Node): boolean {
  // We need absolute positions for accurate comparison
  const innerPos = innerNode.positionAbsolute || innerNode.position;
  const outerPos = outerNode.positionAbsolute || outerNode.position;

  if (!innerPos || !outerPos) {
    return false;
  }

  // Get dimensions. React Flow uses 'measured' for actual rendered size,
  // falling back to style or data if needed.
  const innerWidth = innerNode.measured?.width ?? innerNode.width ?? (innerNode.style?.width as number) ?? 0;
  const innerHeight = innerNode.measured?.height ?? innerNode.height ?? (innerNode.style?.height as number) ?? 0;

  const outerWidth = outerNode.measured?.width ?? outerNode.width ?? (outerNode.style?.width as number) ?? 0;
  const outerHeight = outerNode.measured?.height ?? outerNode.height ?? (outerNode.style?.height as number) ?? 0;

  // Calculate center of the inner node
  const innerCenterX = innerPos.x + innerWidth / 2;
  const innerCenterY = innerPos.y + innerHeight / 2;

  // Calculate bounds of the outer node
  const outerLeft = outerPos.x;
  const outerRight = outerPos.x + outerWidth;
  const outerTop = outerPos.y;
  const outerBottom = outerPos.y + outerHeight;

  // Check containment
  return (
    innerCenterX >= outerLeft &&
    innerCenterX <= outerRight &&
    innerCenterY >= outerTop &&
    innerCenterY <= outerBottom
  );
}
