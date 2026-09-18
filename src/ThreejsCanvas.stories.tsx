import { ThreejsCanvas } from '@digital-twin-threejs';
import type { Meta, StoryObj } from '@storybook/react-vite';

const meta = {
  title: 'Components/ThreejsCanvas',
  component: ThreejsCanvas,
  parameters: { layout: 'fullscreen' },
  decorators: [
    (Story) => <div style={{ width: '100vw', height: '100vh' }}><Story /></div>,
  ],
  args: {
    className: 'storybook-canvas',
    modelUrl: '/models/factory.gltf',
    visualMode: 'original',
    cameraMode: 'persp',
    gridStyle: 'lines',
    sunAzimuth: 132,
    sunElevation: 42,
    shadowsEnabled: true,
  },
  argTypes: {
    visualMode: { control: 'inline-radio', options: ['original', 'wire'] },
    cameraMode: { control: 'inline-radio', options: ['persp', 'ortho'] },
    gridStyle: { control: 'inline-radio', options: ['none', 'lines', 'dots'] },
    sunAzimuth: { control: { type: 'range', min: 0, max: 360, step: 1 } },
    sunElevation: { control: { type: 'range', min: 0, max: 90, step: 1 } },
  },
} satisfies Meta<typeof ThreejsCanvas>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const Wireframe: Story = {
  args: {
    visualMode: 'wire',
    gridStyle: 'dots',
    shadowsEnabled: false,
  },
};
