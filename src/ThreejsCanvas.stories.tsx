import { ThreejsCanvas, type IThreejsCanvasProps } from '@digital-twin-threejs';
import type { Meta, StoryObj } from '@storybook/react-vite';

const meta = {
  title: 'Components/ThreejsCanvas',
  component: ThreejsCanvas,
  parameters: { layout: 'fullscreen' },
  decorators: [
    (Story) => <div className="h-screen w-screen"><Story /></div>,
  ],
  args: {
    className: 'block h-full w-full',
    modelUrl: '/models/factory.gltf',
    visualMode: 'original',
    cameraMode: 'persp',
    gridStyle: 'lines',
    gridExtentScale: 1,
    lightingPreset: 'natural',
    sunAzimuth: 132,
    sunElevation: 42,
    shadowsEnabled: true,
  },
  argTypes: {
    visualMode: { control: 'inline-radio', options: ['original', 'wire'] },
    cameraMode: { control: 'inline-radio', options: ['persp', 'ortho'] },
    gridStyle: { control: 'inline-radio', options: ['none', 'lines', 'dots'] },
    gridExtentScale: { control: { type: 'range', min: 0.5, max: 5, step: 0.25 } },
    lightingPreset: { control: 'select', options: ['natural', 'directional', 'ambient', 'hemisphere'] },
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

export const LoadingViewState: Story = {
  args: {
    modelUrl: '/models/bangalore.glb',
    initialViewportStateLoading: true,
  },
};

export const LoadingViewStateDark: Story = {
  args: {
    modelUrl: '/models/bangalore.glb',
    initialViewportStateLoading: true,
  },
  render: (args: IThreejsCanvasProps) => (
    <div className="dark h-full w-full">
      <ThreejsCanvas {...args} />
    </div>
  ),
};
