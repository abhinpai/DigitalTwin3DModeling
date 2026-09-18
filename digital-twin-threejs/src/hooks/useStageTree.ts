import { useMemo } from 'react';
import type { Object3D } from 'three';
import type { IStageTreeNode } from '../types/stageTreeNode';

export interface IUseStageTreeParams {
  scene: Object3D | null;
}

type Object3DWithFlags = Object3D & {
  isMesh?: boolean;
  isLight?: boolean;
  isCamera?: boolean;
  isHelper?: boolean;
};

function collectChildren(object: Object3DWithFlags): IStageTreeNode[] {
  return object.children.flatMap((child) => {
    const childObject = child as Object3DWithFlags;
    const node = toStageTreeNode(childObject);

    return node ? [node] : collectChildren(childObject);
  });
}

function toStageTreeNode(object: Object3DWithFlags): IStageTreeNode | null {
  if (object.isLight || object.isCamera || object.isHelper) {
    return null;
  }

  const type = object.isMesh ? 'mesh' : 'group';
  const name = object.name.trim() ? object.name : `Unnamed ${type}`;
  const children = collectChildren(object);

  return {
    id: object.uuid,
    name,
    type,
    children,
  };
}

export function useStageTree({ scene }: IUseStageTreeParams): IStageTreeNode | null {
  return useMemo(() => {
    if (!scene) {
      return null;
    }

    return toStageTreeNode(scene as Object3DWithFlags);
  }, [scene]);
}
