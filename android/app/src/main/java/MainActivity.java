package com.easybill.invoice.app;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

// Consent SDK imports
import com.google.android.ump.ConsentInformation;
import com.google.android.ump.ConsentRequestParameters;
import com.google.android.ump.UserMessagingPlatform;
import com.google.android.ump.FormError;

public class MainActivity extends BridgeActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        requestConsent();
    }

    private void requestConsent() {
        ConsentRequestParameters params
                = new ConsentRequestParameters.Builder().build();

        ConsentInformation consentInformation
                = UserMessagingPlatform.getConsentInformation(this);

        consentInformation.requestConsentInfoUpdate(
                this,
                params,
                () -> UserMessagingPlatform.loadAndShowConsentFormIfRequired(
                        this,
                        (FormError formError) -> {
                            // Consent done
                        }
                ),
                formError -> {
                    // Error -> limited ads may show
                }
        );
    }
}
