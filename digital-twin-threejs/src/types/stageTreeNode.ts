export interface IStageTreeNode {
  id: string;
  name: string;
  type: 'group' | 'mesh';
  children: IStageTreeNode[];
}
