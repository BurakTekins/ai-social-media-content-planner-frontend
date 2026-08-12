import { beforeEach, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SettingsPage from './SettingsPage';
import { I18nProvider } from '../i18n';
import { api } from '../api';

vi.mock('../api', () => ({ api: { getGeneralSettings: vi.fn(), updateGeneralSettings: vi.fn() } }));
const settings = {
  publicationConfirmationTimeoutSeconds: 120,
  publicationConfirmationIntervalSeconds: 30,
  publishingMaxItemsPerRun: 10,
  generationMaxContentsPerBatch: 50,
  generationMaxImagesPerBatch: 0,
  generationMaxVideosPerBatch: 0,
  generationMaxEstimatedCostUsd: 15,
  generationEstimatedInputTokensPerItem: 2000,
  generationEstimatedOutputTokensPerItem: 300,
};
let notify;
beforeEach(() => {
  vi.resetAllMocks();
  localStorage.setItem('social-plan-language', 'en');
  notify = vi.fn();
});
const show = () => render(<I18nProvider><SettingsPage notify={notify} /></I18nProvider>);

it('shows loading until the backend supplies settings', async () => {
  let resolve;
  api.getGeneralSettings.mockReturnValue(new Promise(done => { resolve = done; }));
  show();
  expect(screen.getByText('Loading settings')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Save settings' })).not.toBeInTheDocument();
  resolve(settings);
  expect(await screen.findByRole('button', { name: 'Save settings' })).toBeEnabled();
  expect(screen.queryByText('Loading settings')).not.toBeInTheDocument();
});

it('converts entered minutes to seconds and prevents another save while pending', async () => {
  api.getGeneralSettings.mockResolvedValue(settings);
  let resolve;
  api.updateGeneralSettings.mockReturnValue(new Promise(done => { resolve = done; }));
  const user = userEvent.setup();
  show();
  const input = await screen.findByRole('spinbutton', { name: /Verification timeout/ });
  expect(input).toHaveValue(2);
  await user.clear(input);
  await user.type(input, '3');
  await user.click(screen.getByRole('button', { name: 'Save settings' }));
  expect(api.updateGeneralSettings).toHaveBeenCalledExactlyOnceWith({
    ...settings, publicationConfirmationTimeoutSeconds: 180,
  });
  expect(screen.getByRole('button', { name: 'Saving…' })).toBeDisabled();
  resolve({ ...settings, publicationConfirmationTimeoutSeconds: 180 });
  await waitFor(() => expect(notify).toHaveBeenCalledWith(expect.stringContaining('were saved')));
  expect(screen.getByRole('button', { name: 'Save settings' })).toBeEnabled();
});

it('blocks an out-of-range value before sending an update', async () => {
  api.getGeneralSettings.mockResolvedValue(settings);
  const user = userEvent.setup();
  show();
  const input = await screen.findByRole('spinbutton', { name: /Verification timeout/ });
  await user.clear(input);
  await user.type(input, '0');
  expect(input).toBeInvalid();
  await user.click(screen.getByRole('button', { name: 'Save settings' }));
  expect(api.updateGeneralSettings).not.toHaveBeenCalled();
});

it('shows a load error and retries on user request', async () => {
  api.getGeneralSettings.mockRejectedValueOnce(new Error('Settings unavailable')).mockResolvedValueOnce(settings);
  const user = userEvent.setup();
  show();
  expect(await screen.findByText('Settings unavailable')).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: /Try again/ }));
  expect(await screen.findByRole('button', { name: 'Save settings' })).toBeEnabled();
  expect(api.getGeneralSettings).toHaveBeenCalledTimes(2);
});

it('preserves edits after a save failure and allows retry', async () => {
  api.getGeneralSettings.mockResolvedValue(settings);
  api.updateGeneralSettings.mockRejectedValue(new Error('Budget update failed'));
  const user = userEvent.setup();
  show();
  const input = await screen.findByRole('spinbutton', { name: /Verification timeout/ });
  await user.clear(input);
  await user.type(input, '4');
  await user.click(screen.getByRole('button', { name: 'Save settings' }));
  await waitFor(() => expect(notify).toHaveBeenCalledWith('Budget update failed', 'error'));
  expect(input).toHaveValue(4);
  expect(screen.getByRole('button', { name: 'Save settings' })).toBeEnabled();
});
