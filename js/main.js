document.addEventListener('DOMContentLoaded', function () {

    // --- 1. Auto-fill from URL Parameters ---
    const params = new URLSearchParams(window.location.search);

    console.log("URL Params detected:", Object.fromEntries(params.entries())); // Debug log

    // Bill Code
    if (params.has('bill_code')) {
        const billCodeInput = document.getElementById('bill_code');
        if (billCodeInput) billCodeInput.value = params.get('bill_code');
    }

    // Bill ID (Required for submission)
    if (params.has('bill_id')) {
        const billIdInput = document.getElementById('bill_id');
        if (billIdInput) {
            billIdInput.value = params.get('bill_id');
            console.log("Bill ID set to:", billIdInput.value);
        } else {
            console.error("Hidden input #bill_id not found!");
        }
    }

    // Bill Date (ensure format is YYYY-MM-DD for date inputs)
    if (params.has('date')) {
        const billDateInput = document.getElementById('date');
        if (billDateInput) billDateInput.value = params.get('date');
    }

    // Amount
    if (params.has('amount')) {
        const amountInput = document.getElementById('amount');
        if (amountInput) amountInput.value = params.get('amount');
    }

    // --- 2. Field Toggling based on Customer Type ---
    const customerTypeSelect = document.getElementById('customer_type');
    const businessFields = document.getElementById('business_fields');
    const sstFields = document.getElementById('sst_fields');
    const msicFields = document.getElementById('msic_fields');
    const individualFields = document.getElementById('individual_fields');

    function toggleFields() {
        const selectedValue = customerTypeSelect.value;
        if (selectedValue === 'business' || selectedValue === 'government') {
            businessFields.classList.remove('hidden');
            sstFields.classList.remove('hidden');
            if (msicFields) msicFields.classList.remove('hidden');
            if (individualFields) individualFields.classList.add('hidden');

            // Ensure they are visible if using Bootstrap d-none
            businessFields.classList.remove('d-none');
            sstFields.classList.remove('d-none');
            if (msicFields) msicFields.classList.remove('d-none');
            if (individualFields) individualFields.classList.add('d-none');
        } else {
            businessFields.classList.add('hidden');
            sstFields.classList.add('hidden');
            if (msicFields) msicFields.classList.add('hidden');
            if (individualFields) individualFields.classList.remove('hidden');

            if (individualFields) individualFields.classList.remove('d-none');
        }
    }

    // Initial check
    if (customerTypeSelect) {
        toggleFields();
        customerTypeSelect.addEventListener('change', toggleFields);
    }

    // --- 2.1 MSIC Code Dropdown & API Fetch (Custom Autocomplete - Client Side Search & Multi-select) ---
    const msicSearchInput = document.getElementById('msic_code_search');
    const msicResults = document.getElementById('msic_results');
    const btnAddMsic = document.getElementById('btn_add_msic');
    const msicHiddenInput = document.getElementById('msic_code');
    const selectedMsicContainer = document.getElementById('selected_msic_container');

    let allMsicData = [];
    let isDataFetched = false;
    let selectedMsicCodes = []; // Array to store selected codes

    if (msicSearchInput && msicResults) {
        // Function to fetch all data once
        function fetchMsicData() {
            if (isDataFetched) return;

            fetch('https://management.tungmaexpress.com.my/api/msic/search')
                .then(response => {
                    if (!response.ok) throw new Error('Network response was not ok');
                    return response.json();
                })
                .then(data => {
                    if (Array.isArray(data)) {
                        allMsicData = data;
                        isDataFetched = true;
                    }
                })
                .catch(error => console.error('Error fetching MSIC codes:', error));
        }

        // Hide results when clicking outside
        document.addEventListener('click', function (e) {
            if (!msicSearchInput.contains(e.target) && !msicResults.contains(e.target)) {
                msicResults.style.display = 'none';
            }
        });

        // Handle item selection via delegation
        msicResults.addEventListener('click', function (e) {
            const item = e.target.closest('.list-group-item');
            if (item) {
                e.preventDefault();
                const code = item.getAttribute('data-id');
                const text = item.getAttribute('data-text');

                // Fill search input for review before adding
                msicSearchInput.value = `${code} - ${text}`;
                msicResults.style.display = 'none';
            }
        });

        function filterAndRender(query) {
            if (!isDataFetched) {
                fetchMsicData();
                return;
            }

            msicResults.innerHTML = '';

            if (query.length < 1) {
                msicResults.style.display = 'none';
                return;
            }

            const lowerQuery = query.toLowerCase();

            // Filter data
            const filtered = allMsicData.filter(item => {
                // Search by ID or Text
                return (item.id && item.id.toString().toLowerCase().includes(lowerQuery)) ||
                    (item.text && item.text.toLowerCase().includes(lowerQuery));
            });

            if (filtered.length > 0) {
                // Limit to top 50 to prevent lagging
                filtered.slice(0, 50).forEach(item => {
                    const a = document.createElement('a');
                    a.href = '#';
                    a.className = 'list-group-item list-group-item-action text-start';
                    a.setAttribute('data-id', item.id);
                    a.setAttribute('data-text', item.text);
                    a.textContent = `${item.id} - ${item.text}`;
                    msicResults.appendChild(a);
                });
                msicResults.style.display = 'block';
            } else {
                msicResults.style.display = 'none';
            }
        }

        msicSearchInput.addEventListener('input', function () {
            const query = this.value.trim();
            filterAndRender(query);
        });

        msicSearchInput.addEventListener('focus', function () {
            fetchMsicData();
            if (this.value.trim().length > 0) {
                filterAndRender(this.value.trim());
            }
        });

        // --- Multi-select Logic ---
        function updateHiddenInput() {
            // Join all selected codes with a comma
            msicHiddenInput.value = selectedMsicCodes.join(', ');
        }

        function renderSelectedTags() {
            selectedMsicContainer.innerHTML = '';
            selectedMsicCodes.forEach((code, index) => {
                const badge = document.createElement('div');
                badge.className = 'badge bg-secondary d-flex align-items-center p-2';
                badge.innerHTML = `
                    <span class="me-2">${code}</span>
                    <button type="button" class="btn-close btn-close-white ms-auto" aria-label="Remove" data-index="${index}"></button>
                `;
                selectedMsicContainer.appendChild(badge);
            });
        }

        // Add Button Click
        if (btnAddMsic) {
            btnAddMsic.addEventListener('click', function () {
                const val = msicSearchInput.value.trim();
                if (!val) return;

                // Check if already exists (prevent duplicates)
                if (!selectedMsicCodes.includes(val)) {
                    selectedMsicCodes.push(val);
                    updateHiddenInput();
                    renderSelectedTags();
                    msicSearchInput.value = ''; // Clear input after adding
                } else {
                    Swal.fire({
                        icon: 'warning',
                        title: 'Duplicate',
                        text: 'This MSIC code is already added.',
                        toast: true,
                        position: 'top-end',
                        showConfirmButton: false,
                        timer: 2000
                    });
                }
            });
        }

        // Remove Tag Click
        selectedMsicContainer.addEventListener('click', function (e) {
            if (e.target.classList.contains('btn-close')) {
                const index = e.target.getAttribute('data-index');
                selectedMsicCodes.splice(index, 1);
                updateHiddenInput();
                renderSelectedTags();
            }
        });
    }

    // --- 3. Form Submission ---
    const form = document.getElementById('einvoiceForm');

    if (form) {
        form.addEventListener('submit', function (e) {
            e.preventDefault();

            // Basic Client-side Validation
            const billId = document.getElementById('bill_id').value;
            const date = document.getElementById('date').value;
            const amount = document.getElementById('amount').value;
            const customerType = document.getElementById('customer_type').value;
            const tinNumber = document.getElementById('tin_number').value;
            const address = document.getElementById('customer_address').value;
            const postcode = document.getElementById('customer_postcode').value;
            const city = document.getElementById('customer_city').value;
            const state = document.getElementById('customer_state').value;
            const country = document.getElementById('customer_country').value;

            // Optional: Add specific checks for 'required' fields not covered by HTML 'required' attribute
            if (!billId) {
                Swal.fire('Error', 'Bill ID is missing. Please scan the QR code properly.', 'error');
                return;
            }

            // Prepare Payload
            const payload = {
                Date: date,
                Bill_id: billId,
                amount: amount,
                tin_number: tinNumber,
                customer_name: document.getElementById('customer_name').value,
                customer_type: customerType,
                contact_number: document.getElementById('contact_number').value,
                email_address: document.getElementById('email_address').value,
                address: address,
                postcode: postcode,
                city: city,
                state: state,
                country: country,

                // Conditional Fields
                msic_code: selectedMsicCodes, // Send as Array
                sst_reg_number: document.getElementById('sst_registration_number').value
            };

            // Mapping Identity Type/IC/Business Reg
            if (customerType === 'business' || customerType === 'government') {
                payload.business_reg_number = document.getElementById('business_registration_number').value;
                payload.old_business_reg_number = document.getElementById('old_business_registration_number').value;
                payload['identity type'] = 'BRN'; // Assuming BRN for business
            } else {
                payload.customer_ic = document.getElementById('identification_number').value;
                payload['identity type'] = 'NRIC'; // Assuming NRIC for individual/default
                // Note: user didn't specify strict enum for identity type, assuming logical defaults or 'NRIC'/'Passport' mapping if needed. 
                // For now, sending 'NRIC' or user input if there was a field (there isn't one explicitly requested yet).
            }

            // Show Loading
            Swal.fire({
                title: 'Submitting...',
                text: 'Please wait while we validate your details.',
                allowOutsideClick: false,
                didOpen: () => {
                    Swal.showLoading();
                }
            });

            // Send POST Request using JSON
            fetch('https://management.tungmaexpress.com.my/api/submit-eform', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(payload)
            })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        Swal.fire({
                            title: 'Success!',
                            text: data.message || 'Saved successfully',
                            icon: 'success',
                            confirmButtonColor: '#0d6efd'
                        }).then(() => {
                            // Optional: Redirect or Reset
                            // window.location.reload(); 
                        });
                    } else {
                        Swal.fire({
                            title: 'Error!',
                            text: data.message || 'Submission failed. Please try again.',
                            icon: 'error',
                            confirmButtonColor: '#dc3545'
                        });
                    }
                })
                .catch(error => {
                    console.error('Submission Error:', error);
                    Swal.fire({
                        title: 'System Error',
                        text: 'An error occurred while communicating with the server.',
                        icon: 'error',
                        confirmButtonColor: '#dc3545'
                    });
                });
        });
    }
});
