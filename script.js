const year = document.querySelector('[data-current-year]');

if (year) {
	year.textContent = new Date().getFullYear();
}

document.querySelectorAll('[data-profile-image]').forEach((image) => {
	const slot = image.parentElement;
	const showPhoto = () => slot.classList.add('has-photo');
	const showPlaceholder = () => {
		image.hidden = true;
	};

	image.addEventListener('load', showPhoto, { once: true });
	image.addEventListener('error', showPlaceholder, { once: true });

	if (image.complete) {
		image.naturalWidth ? showPhoto() : showPlaceholder();
	}
});
