// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

interface ICuriaResolver {
    // event
    event IssuerUpdated(address indexed account, bool enabled);
    // error

    error NotIssuer();
    // function

    function isIssuer(address account) external view returns (bool);
    function setIssuer(address account, bool enable) external;
}
