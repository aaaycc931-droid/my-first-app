package com.aaaycc931.solfeggio;

import static org.junit.Assert.assertEquals;

import org.junit.Test;

public class ApplicationIdTest {

    @Test
    public void applicationIdIsStable() {
        assertEquals("com.aaaycc931.solfeggio", BuildConfig.APPLICATION_ID);
    }
}
