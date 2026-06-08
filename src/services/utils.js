export function formatDate(value) {
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
  }).format(new Date(value));
}

export function formatRelativeTime(value) {
  const target = new Date(value).getTime();
  const diffSeconds = Math.round((target - Date.now()) / 1000);
  const formatter = new Intl.RelativeTimeFormat('en-US', { numeric: 'always' });
  const oneDayInSeconds = 60 * 60 * 24;

  if (Math.abs(diffSeconds) >= oneDayInSeconds) {
    return formatDate(value);
  }

  const units = [
    ['hour', 60 * 60],
    ['minute', 60],
    ['second', 1],
  ];

  for (const [unit, seconds] of units) {
    if (Math.abs(diffSeconds) >= seconds || unit === 'second') {
      return formatter.format(Math.round(diffSeconds / seconds), unit);
    }
  }

  return formatDate(value);
}

export function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

export function parseErrorMessage(error) {
  return error instanceof Error ? error.message : 'Something went wrong.';
}

export async function imageFileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Unable to preview the image.'));
    reader.readAsDataURL(file);
  });
}

export async function resizeImageFile(file) {
  if (file.size <= 950000) {
    return file;
  }

  const imageUrl = await imageFileToDataUrl(file);
  const image = await new Promise((resolve, reject) => {
    const nextImage = new Image();
    nextImage.onload = () => resolve(nextImage);
    nextImage.onerror = () => reject(new Error('Unable to process selected image.'));
    nextImage.src = imageUrl;
  });

  const maxWidth = 1600;
  const scale = Math.min(1, maxWidth / image.width);
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(image.width * scale);
  canvas.height = Math.round(image.height * scale);

  const context = canvas.getContext('2d');
  context.drawImage(image, 0, 0, canvas.width, canvas.height);

  const blob = await new Promise((resolve) => {
    canvas.toBlob(resolve, 'image/jpeg', 0.82);
  });

  if (!blob) {
    throw new Error('Unable to optimize the image file.');
  }

  if (blob.size > 1000000) {
    throw new Error('Image is still above 1 MB after compression.');
  }

  return new File([blob], file.name.replace(/\.\w+$/, '.jpg'), {
    type: 'image/jpeg',
  });
}
